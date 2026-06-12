module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");

  // A filter to format dates nicely
  eleventyConfig.addFilter("readableDate", (dateStr) => {
    const { format, parseISO } = require("date-fns");
    return format(parseISO(dateStr), "MMMM d, yyyy");
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};
