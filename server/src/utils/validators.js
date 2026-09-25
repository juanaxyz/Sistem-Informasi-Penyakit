const validateId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const escapeLike = (input) => input.replace(/[\\*?%_]/g, "\\$&");

module.exports = { validateId, escapeLike };