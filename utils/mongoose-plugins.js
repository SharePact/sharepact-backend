const mongoose = require("mongoose");

function writeOnlyPlugin(schema, options) {
  // Add toJSON method to schema
  schema.methods.toJSON = function () {
    const obj = this.toObject();
    // Remove write-only fields specified in options
    if (options && options.writeOnlyFields) {
      options.writeOnlyFields.forEach((field) => {
        delete obj[field];
      });
    }
    return obj;
  };

  // Add static method to handle arrays
  schema.statics.toJSON = function (docs) {
    if (Array.isArray(docs)) {
      return docs.map((doc) => doc.toJSON());
    } else {
      return docs.toJSON();
    }
  };
}

const updateTimestampPlugin = (schema) => {
  schema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
  });

  schema.pre("findOneAndUpdate", function (next) {
    this.set({ updatedAt: Date.now() });
    next();
  });
};

module.exports = {
  writeOnlyPlugin,
  updateTimestampPlugin,
};
