const frontMatter = require('front-matter');
const handlebars = require('handlebars');
const handlebarsWax = require('handlebars-wax');
const handlebarsLayouts = require('handlebars-layouts');
const handlebarsHelpers = require('handlebars-helpers')();
const HTMLAsset = require('parcel-bundler/src/assets/HTMLAsset');
const configFiles = ['handlebars.config.js', 'handlebars.config.json', 'hbs.config.js', 'hbs.config.json'];
const { prepareConfig, parseSimpleLayout } = require('./utils');

class HbsAsset extends HTMLAsset {

  async parse(code) {
    // refresh config
    const userConfig = (await this.getConfig(configFiles)) || {};
    const config = prepareConfig(userConfig);

    // create a new Wax object with the fresh config
    this.wax = handlebarsWax(handlebars, config.wax)
      .helpers(handlebarsLayouts)
      .helpers(handlebarsHelpers)
      .helpers(`${config.helpers.path}/**/*.js`, config.helpers)
      .data(`${config.data.path}/**/*.{json,js}`, config.data)
      .decorators(`${config.decorators.path}/**/*.js`, config.decorators)
      .partials(`${config.layouts.path}/**/*.{hbs,handlebars,js}`, config.layouts)
      .partials(`${config.partials.path}/**/*.{hbs,handlebars,js}`, config.partials);

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
