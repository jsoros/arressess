module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy(".nojekyll");

  // A filter to format dates nicely
  eleventyConfig.addFilter("readableDate", (dateStr) => {
    if (!dateStr) return "";
    const { format, parseISO } = require("date-fns");
    return format(parseISO(dateStr), "MMMM d, yyyy");
  });

  return {
    pathPrefix: "/arressess/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};
