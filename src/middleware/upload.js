// This file is deprecated - we now use direct S3 uploads via presigned URLs
// Following AWS best practices from the s3-guide.txt
//
// The previous server-side proxied upload pattern has been replaced with:
// 1. Client requests presigned URL from backend
// 2. Client uploads directly to S3 using presigned POST
// 3. Backend provides security validation via POST policy conditions
//
// This approach provides better:
// - Performance (no server bottleneck)
// - Scalability (leverages S3's infrastructure)
// - Security (server-enforced policy conditions)
// - Cost efficiency (no server data transfer costs)
//
// See: /src/services/s3Service.js and /src/routes/upload.js for new implementation

module.exports = {
  // Legacy compatibility - this middleware is no longer used
  deprecated: true,
  message: 'Upload middleware replaced with S3 presigned URLs. See s3Service.js'
};