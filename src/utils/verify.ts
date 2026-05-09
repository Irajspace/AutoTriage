import crypto from 'crypto'

export const verifyGitHubSignature=function verifyGitHubSignature(
    payload:string,
    signature:string,
    secret:string

):boolean{
    try {
   
    const hmac = crypto.createHmac("sha256", secret);

   
    const digest = "sha256=" + hmac.update(payload).digest("hex");

 
    const sigBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);

   
    if (sigBuffer.length !== digestBuffer.length) {
      return false;
    }

   
    return crypto.timingSafeEqual(sigBuffer, digestBuffer);
  } catch (err) {
    return false;
  }
}