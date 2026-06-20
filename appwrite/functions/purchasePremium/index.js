module.exports = async ({ res }) => {
  return res.json({
    success: false,
    error: 'Premium plans have been removed. Job posting and applicant acceptance are unlimited.',
  }, 410);
};
