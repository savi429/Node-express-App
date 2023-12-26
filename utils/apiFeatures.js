class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //1)Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    //2) Advance Filtering
    // {difficulty:'easy',duration:{$gte:5}}
    //{difficulty:'easy',duration:{gte:5}}
    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`,
    );
    this.query = this.query.find(
      Object.keys(JSON.parse(queryString)).length > 0
        ? JSON.parse(queryString)
        : {},
    );
    return this;
    // let query = Tour.find(
    //   Object.keys(JSON.parse(queryString)).length > 0
    //     ? JSON.parse(queryString)
    //     : {},
    // );
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
      console.log('fields->', fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skipp = (page - 1) * limit;
    this.query = this.query.skip(skipp).limit(limit);
    return this;
  }
}
module.exports = APIFeatures;
