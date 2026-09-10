const paginate = (query, { page = 1, limit = 20, sort = '-createdAt' }) => {
  const skip = (page - 1) * limit;
  return query.sort(sort).skip(skip).limit(limit);
};

const getPaginationMeta = (total, page, limit) => {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
  };
};

module.exports = { paginate, getPaginationMeta };
