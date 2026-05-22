const { doctor } = require("../startup/db");

class ApiFeatures {
  constructor(prismaModel, queryString, modelName, initialArgs = {}) {
    this.model = prismaModel;
    this.queryString = queryString;
    this.modelName = modelName;
    this.prismaArgs = {
      where: initialArgs.where || {}, 
      orderBy: {},
      skip: 0,
      take: 20,
      select: {}
    };
    this.paginationResult = null;
  }

  search() {
      const keyword = this.queryString.search;
      if (!keyword) return this;

      const searchFields = {
          User: ["firstName", "lastName", "email", "phone"],
          Doctor: ["firstName", "lastName", "email"],
          Appointment: ["appointmentCode"],
          Admin: ["firstName", "lastName", "email"]
      };

      const relationSearch = {
          Appointment: [
              { doctor: { firstName: { contains: keyword, mode: "insensitive" } } },
              { doctor: { lastName: { contains: keyword, mode: "insensitive" } } },
              { user: { firstName: { contains: keyword, mode: "insensitive" } } },
              { user: { lastName: { contains: keyword, mode: "insensitive" } } },
          ]
      }

      const fields = searchFields[this.modelName] || []
      const relations = relationSearch[this.modelName] || []

      this.prismaArgs.where.OR = [
          ...fields.map((field) => ({
              [field]: { contains: keyword, mode: "insensitive" }
          })),
          ...relations
      ]

      return this
  }

  filter() {
    const queryObj = { ...this.queryString };
    const removeFields = ["search", "page", "limit", "sort", "select"];
    removeFields.forEach((key) => delete queryObj[key]);

    const where = { ...this.prismaArgs.where };

    const parseValue = (value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        if (!isNaN(value) && value !== "") return Number(value);
        return value;
    };

    // Relation Search 
    const relationFields = {
        doctor: (value) => ({
            doctor: {
                OR: [
                    {id: { contains: value, mode: "insensitive" } },
                    {email: { contains: value, mode: "insensitive" } },
                    {phone: { contains: value, mode: "insensitive" } },
                    { firstName: { contains: value, mode: "insensitive" } },
                    { lastName: { contains: value, mode: "insensitive" } },
                    { specialization: { contains: value, mode: "insensitive" } }
                ]
            }
        }),
        user: (value) => ({
            user: {
                OR: [
                    {id: { contains: value, mode: "insensitive" } },
                    {email: { contains: value, mode: "insensitive" } },
                    {phone: { contains: value, mode: "insensitive" } },
                    { firstName: { contains: value, mode: "insensitive" } },
                    { lastName: { contains: value, mode: "insensitive" } }
                ]
            }
        })
    }

    for (const key in relationFields) {
        if (queryObj[key]) {
            Object.assign(where, relationFields[key](queryObj[key]))
            delete queryObj[key]
        }
    }

    // Date Range
    if (queryObj.startDate || queryObj.endDate) {
        where.createdAt = {}
        if (queryObj.startDate) {
            const start = new Date(queryObj.startDate)
            if (!isNaN(start)) where.createdAt.gte = start
            delete queryObj.startDate
        }
        if (queryObj.endDate) {
            const end = new Date(queryObj.endDate)
            if (!isNaN(end)) where.createdAt.lte = end
            delete queryObj.endDate
        }
        if (Object.keys(where.createdAt).length === 0) delete where.createdAt
    }

    // Operators
    const operators = ["gt", "gte", "lt", "lte"]

    for (const key in queryObj) {
        if (
            !queryObj[key] ||
            typeof queryObj[key] !== "object" ||
            Array.isArray(queryObj[key])
        ) {
            where[key] = parseValue(queryObj[key])
            continue
        }
        where[key] = {}
        for (const op of operators) {
            if (queryObj[key][op] !== undefined) {
                where[key][op] = parseValue(queryObj[key][op])
            }
        }
    }

    this.prismaArgs.where = where
    return this
}

  sort() {
    const sortType = this.queryString.sort;

    if (sortType === "oldest") {
      this.prismaArgs.orderBy = { createdAt: "asc" };
    } else {
      // default: latest first
      this.prismaArgs.orderBy = { createdAt: "desc" };
    }

    return this;
  }

  paginate() {
    const page  = this.queryString.page  ? Number(this.queryString.page)  : 1;
    const limit = this.queryString.limit ? Number(this.queryString.limit) : 20;

    this.prismaArgs.skip = (page - 1) * limit;
    this.prismaArgs.take = limit;

    return this;
  }

  cleanResponse() {
    // Exclude updatedAt from select — Prisma uses select object (false = exclude)
    // Note: Prisma select works as whitelist, so we handle this in execute()
    this._cleanResponse = true;
    return this;
  }

  async calculatePagination() {
    // Count without skip/take
    const totalDocs = await this.model.count({ where: this.prismaArgs.where });

    const page  = this.queryString.page  ? Number(this.queryString.page)  : 1;
    const limit = this.queryString.limit ? Number(this.queryString.limit) : 20;

    const totalPages = Math.ceil(totalDocs / limit);

    this.paginationResult = {
      currentPage:  page,
      limit:        limit,
      totalPages:   totalPages,
      totalResults: totalDocs,
      hasNextPage:  page < totalPages,
      hasPrevPage:  page > 1
    };

    return this;
  }

  async execute(extraArgs = {}) {

      const args = {
          where: this.prismaArgs.where,
          orderBy: this.prismaArgs.orderBy,
          skip: this.prismaArgs.skip,
          take: this.prismaArgs.take,
          ...this.extraArgs,
          ...extraArgs
      };

      // cleanResponse — omit updatedAt
      if (this._cleanResponse) {
          args.omit = { updatedAt: true };
      }

      return this.model.findMany(args);
  }
}

module.exports = ApiFeatures;