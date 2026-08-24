export const isPdfBuffer = (buffer: Buffer): boolean => {
  if (buffer.length < 5) {
    return false;
  }

  const signature = buffer.subarray(0, 5).toString("ascii");

  return signature === "%PDF-";
};
