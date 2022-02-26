import { ActionFunction, Form, useActionData } from "remix";
import { gunzip as zgunzip } from "zlib";

interface DecodeError {
  ok: false;
  errors: {
    encoded?: boolean;
    encodedNotJson?: boolean;
    encodedNotGzip?: string;
  };
}

interface DecodeSuccess {
  ok: true;
  decoded: string;
}

type DecodeResponse = DecodeError | DecodeSuccess;

export const action: ActionFunction = async ({
  request,
}): Promise<DecodeResponse> => {
  const { promisify } = require("util");
  const gunzip = promisify(zgunzip);

  const formData = await request.formData();
  const encoded = formData.get("encoded");

  const errorResponse: DecodeError = { ok: false, errors: {} };
  if (!encoded) errorResponse.errors.encoded = true;
  if (Object.keys(errorResponse.errors).length) {
    return errorResponse;
  }

  let parsed;
  try {
    parsed = JSON.parse(encoded as string);
  } catch (error) {
    errorResponse.errors.encodedNotJson = true;
    return errorResponse;
  }

  let decodedBuffer;
  try {
    decodedBuffer = await gunzip(Buffer.from(parsed, "utf8"));
  } catch (error) {
    errorResponse.errors.encodedNotGzip =
      error instanceof Error ? error.message : "Unknown error";
    return errorResponse;
  }

  const decoded = decodedBuffer.toString();

  return { ok: true, decoded };
};

export default function Decoder() {
  const response = useActionData<DecodeResponse>();
  const errorResponse = !response?.ok ? response : undefined;
  const successResponse = response?.ok ? response : undefined;
  const defaultEncoded = JSON.stringify([
    31, 139, 8, 0, 0, 0, 0, 0, 0, 3, 171, 86, 74, 206, 207, 45, 72, 204, 171,
    244, 76, 81, 178, 82, 48, 52, 50, 54, 169, 5, 0, 128, 240, 93, 162, 19, 0,
    0, 0,
  ]);
  return (
    <main>
      <h1>Decoder</h1>
      <Form method="post">
        <label>
          <div>Encoded</div>
          <textarea name="encoded" defaultValue={defaultEncoded} />
          {errorResponse?.errors?.encoded && <div>Encoded is required</div>}
          {errorResponse?.errors?.encodedNotJson && (
            <div>Encoded should be JSON</div>
          )}
          {errorResponse?.errors?.encodedNotGzip && (
            <div>
              Encoded failed to be ungzipped:{" "}
              {errorResponse.errors.encodedNotGzip}
            </div>
          )}
        </label>
        <div>
          <button>Decode</button>
        </div>
      </Form>

      {successResponse && (
        <div>
          Decoded <div>{successResponse.decoded}</div>
        </div>
      )}
    </main>
  );
}
