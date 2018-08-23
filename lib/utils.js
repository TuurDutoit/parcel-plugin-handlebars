const fs = require('fs');
const path = require('path');
const configFiles = ['handlebars.config.js', 'handlebars.config.json', 'hbs.config.js', 'hbs.config.json'];
const types = [
  { name: 'data', helper: 'data', extensions: '{js,json}' },
  { name: 'decorators', helper: 'decorators', extensions: 'js' },
  { name: 'helpers', helper: 'helpers', extensions: 'js' },
  { name: 'layouts', helper: 'partials', extensions: '{hbs,handlebars,js}' },
  { name: 'partials', helper: 'partials', extensions: '{hbs,handlebars,js}' },
];

// Adapted from require-glob

function toNestedObject(obj, key) {
  if (!obj[key]) {
    obj[key] = {};
  }

  return obj[key];
}

function reducer(options, tree, fileObj) {
  if (!fileObj || !fileObj.path || !('exports' in fileObj)) {
    return tree;
  }

  options.dependencies.add(fileObj.path);

  const keys = [].concat(options.keygen(fileObj));

  if (!keys.length) {
    return tree;
  }

  const lastKey = keys.pop();
  const obj = keys.reduce(toNestedObject, tree);

  obj[lastKey] = fileObj.exports;

  return tree;
}

// END Adapted from require-glob

function prepareConfig(userConfig) {
  const config = {
    wax: Object.assign({ reducer, dependencies: new Set() }, userConfig.wax),
  };

  types.forEach(type_ => {
    const type = type_.name;
    let typeConfig = userConfig[type] || {};

    if (typeof typeConfig === 'string') {
      typeConfig = { path: typeConfig };
    }

    if (Array.isArray(typeConfig)) {
      typeConfig = { paths: typeConfig };
    }

    if (typeof typeConfig.paths === 'string') {
      typeConfig.paths = [typeConfig.paths];
    }

    if (typeConfig.path) {
      if (!Array.isArray(typeConfig.paths)) {
        typeConfig.paths = [];
      }

      if (!typeConfig.paths.includes(typeConfig.path)) {
        typeConfig.paths.push(typeConfig.path);
      }
    }

    config[type] = Object.assign({}, { paths: [`src/markup/${type}`] }, typeConfig);
  });

  return config;
}

const parseSimpleLayout = (str, opts) => {
  const layoutPattern = /{{!<\s+([A-Za-z0-9._\-/]+)\s*}}/;
  const matches = str.match(layoutPattern);

  if (matches) {
    let layout = matches[1];

    if (opts.layouts && layout[0] !== '.') {
      layout = path.resolve(opts.layouts, layout);
    }

    const hbsLayout = path.resolve(process.cwd(), `${layout}.hbs`);

    if (fs.existsSync(hbsLayout)) { // eslint-disable-line no-sync
      const content = fs.readFileSync(hbsLayout, { encoding: 'utf-8' }); // eslint-disable-line no-sync
      return content.replace('{{{body}}}', str);
    }

    const handlebarsLayout = hbsLayout.replace('.hbs', '.handlebars');

    if (fs.existsSync(handlebarsLayout)) { // eslint-disable-line no-sync
      const content = fs.readFileSync(handlebarsLayout, { encoding: 'utf-8' }); // eslint-disable-line no-sync
      return content.replace('{{{body}}}', str);
    }
  }

  return str;
};

module.exports = {
  prepareConfig,
  parseSimpleLayout,
  configFiles,
  types,
};
