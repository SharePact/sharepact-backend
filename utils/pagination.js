const getPaginatedResults = async (
  model,
  page,
  limit,
  query = {},
  projection = {},
  options = {}
) => {
  try {
    const skip = (page - 1) * limit;
    const results = await model
      .find(query, projection, options)
      .skip(skip)
      .limit(limit);

    const totalItems = await model.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      results,
      pagination: { totalItems, totalPages, currentPage: page },
    };
  } catch (err) {
    console.error(err);
    throw new Error("Error fetching paginated results");
  }
};

/**
    Explanation
    model: The Mongoose model you want to paginate.
    page: The current page number.
    limit: The number of items per page.
    query: (Optional) A query object to filter the documents.
    projection: (Optional) A projection object to specify which fields to return.
    options: (Optional) Additional query options.

    examples:

    const userResults = await getPaginatedResults(User, userPage, userLimit, {}, 'username email');

    const results = await getPaginatedResults(Item, page, limit, { value: { $gt: 10 } }, {}, { sort: { name: 1 } });
    console.log('Items sorted by name:', results);

    const results = await getPaginatedResults(User, page, limit, {}, {}, { populate: { path: 'profile', select: 'bio' } });
    console.log('Users with populated profile:', results);
 */

module.exports = {
  getPaginatedResults,
};
