const frontMatter = require('front-matter');
const handlebars = require('handlebars');
const handlebarsWax = require('handlebars-wax');
const handlebarsLayouts = require('handlebars-layouts');
const handlebarsHelpers = require('handlebars-helpers')();
const HTMLAsset = require('parcel-bundler/src/assets/HTMLAsset');
const { prepareConfig, parseSimpleLayout, configFiles, types } = require('./utils');

class HbsAsset extends HTMLAsset {

  async parse(code) {
    // refresh config
    const userConfig = (await this.getConfig(configFiles)) || {};
    const config = prepareConfig(userConfig);

    // create a new Wax object with the fresh config
    this.wax = handlebarsWax(handlebars, config.wax)
      .helpers(handlebarsLayouts)
      .helpers(handlebarsHelpers);

    for (const type of types) {
      for (const path of config[type.name].paths) {
        this.wax[type.helper](`${path}/**/*.{${type.extensions.join(',')}}`, config[type.name]);
      }
    }

    // process any frontmatter yaml in the template file
    const frontmatter = frontMatter(code);

    // process simple layout mapping that does not use handlebars-layouts. i.e {{!< base}}
    const content = parseSimpleLayout(frontmatter.body, config);

    // combine frontmatter data with NODE_ENV variable for use in the template
    const data = Object.assign({}, frontmatter.attributes, { NODE_ENV: process.env.NODE_ENV });

    // compile template into html markup and assign it to this.contents. super.generate() will use this variable.
    this.contents = this.wax.compile(content)(data);

    // Return the compiled HTML
    return super.parse(this.contents);
  }

  collectDependencies() {
    super.collectDependencies();

    for (const depPath of this.wax.config.dependencies) {
      this.addDependency(depPath, { includedInParent: true });
    }
  }
  
}

module.exports = HbsAsset;
