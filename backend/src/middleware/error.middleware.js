function notFound(_req, res) { res.status(404).json({ message: 'Route not found' }); }
function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'Record already exists' });
  const status = err.status || 500;
  res.status(status).json({ message: status === 500 ? 'Internal server error' : err.message });
}
module.exports = { notFound, errorHandler };
