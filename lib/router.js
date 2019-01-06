const _ = require('lodash');
const inflect = require('inflect');

module.exports = {
  options, head, get, post, put, patch, del, // @NOTE: low-level routes
  scope, resource, resources, // @NOTE: high-level routes
  $walk, // @NOTE: utils
};

// == @SECTION: low-level routes == //

function options(name, options) {
  return $route('head', name, options);
}

function head(name, options) {
  return $route('head', name, options);
}

function get(name, options) {
  return $route('get', name, options);
}

function post(name, options) {
  return $route('post', name, options);
}

function put(name, options) {
  return $route('put', name, options);
}

function patch(name, options) {
  return $route('patch', name, options);
}

function del(name, options) {
  return $route('delete', name, options);
}



// == @SECTION: high-level routes == //

function scope(name, options, children) {
  return $route('scope', name, options, children);
}

const RESOURCE_ACTIONS = ['new', 'create', 'show', 'update', 'destroy'];
function resource(name, options, children) {
  const enabled = $enabledActions(name, options, children, RESOURCE_ACTIONS);
  return $route('resource', name, options, children, _.compact([
    // @NOTE: singleton does not have index action
    // @NOTE: singleton actions do not have distinction between member/collection
    enabled.new && get('new', { action: 'new' }),
    enabled.create && post('/', { action: 'create' }),
    enabled.show && get('/', { action: 'show' }),
    enabled.update && put('/', { action: 'update' }),
    enabled.destroy && del('/', { action: 'destroy' }),
  ]));
}

const RESOURCES_ACTIONS = ['index', 'new', 'create', 'show', 'update', 'destroy'];
function resources(name, options, children) {
  const enabled = $enabledActions(name, options, children, RESOURCES_ACTIONS);
  return $route('resources', name, options, children, _.compact([
    enabled.index && get('/', { collection: true, action: 'index' }),
    enabled.new && get(`new`, { collection: true, action: 'new' }),
    enabled.create && post('/', { collection: true, action: 'create' }),
    enabled.show && get('/', { action: 'show' }),
    enabled.update && put('/', { action: 'update' }),
    enabled.destroy && del('/', { action: 'destroy' }),
  ]));
}



// == @SECTION: utils == //

function $walk(routes, fn) {
  for (const route of routes) {
    iterate(route, fn);
  }

  function iterate(currentRoute, fn, basepath, resourceRoute) {
    if (['options', 'head', 'get', 'post', 'put', 'patch', 'delete'].includes(currentRoute.type)) {
      const name = _.get(resourceRoute, 'name') || null;
      const singular = name ? inflect.singularize(name) : null;
      const plural = name ? inflect.pluralize(name) : null;

      const controller = _.get(currentRoute, 'options.controller') || _.get(resourceRoute, 'options.controller') || (_.get(resourceRoute, 'type') === 'resource' ? singular : plural);
      const model = _.get(currentRoute, 'options.model') || _.get(resourceRoute, 'options.model') || singular;
      const action = _.get(currentRoute, 'options.action') || currentRoute.name;

      const method = currentRoute.type;
      const path = '/' + joinSegments(basepath, currentRoute.name);

      fn({
        method, path, // @NOTE: routing
        controller, action, model, // @NOTE: processing
      });
    }

    else if (['resource', 'resources'].includes(currentRoute.type)) {
      const name = currentRoute.name || null;
      const singular = name ? inflect.singularize(name) : null;

      for (const childRoute of currentRoute.children) {
        let memberSegment = '/';
        if (currentRoute.type === 'resources' && !_.get(childRoute, 'options.collection')) {
          memberSegment = `/:${singular}Id`; // @TODO: abstract away route syntax
        }
        const path = joinSegments(basepath, currentRoute.name, memberSegment);
        iterate(childRoute, fn, path, currentRoute);
      }
    }

    else if (['scope'].includes(currentRoute.type)) {
      const path = joinSegments(basepath, currentRoute.name);
      for (const childRoute of currentRoute.children) {
        iterate(childRoute, fn, path, resourceRoute);
      }
    }

    else {
      throw new Error(`Unexpected situation: unknown route type ${currentRoute.type}`);
    }
  }
}



// == @SECTION: implementation == //

function $route(type, name, options, children, extraChildren) {
  [name, options, children] = $params(name, options, children);

  const route = { type };
  if (name) route.name = name;
  if (options) route.options = options;
  if (!_.isEmpty(children) || !_.isEmpty(extraChildren)) {
    route.children = _.concat(_.toArray(children), _.toArray(extraChildren));
  }

  return route;
}

function $enabledActions(name, options, children, actions) {
  [name, options, children] = $params(name, options, children);

  const only = _.compact(_.castArray(_.get(options, 'only', actions)));
  const except = _.compact(_.castArray(_.get(options, 'except')));
  const enabled = _.difference(only, except);

  const index = {};
  for (const action of only) {
    index[action] = _.includes(enabled, action);
  }

  return index;
}

function $params(name, options, children) {
  if (children === undefined) {
    if (_.isArray(options)) {
      children = options;
      options = undefined;
    }
    else if (_.isArray(name)) {
      children = name;
      name = undefined;
    }
  }

  if (options === undefined) {
    if (_.isObject(name)) {
      options = name;
      name = undefined;
    }
  }

  if (name === undefined) {
    name = '/';
  }

  return [name, options, children];
}

function joinSegments(...segments) {
  segments = _(segments)
    .map(segment => {
      if (segment == null) {
        return '';
      }

      segment = String(segment);

      while (segment[segment.length - 1] === '/') {
        segment = segment.slice(0, -1);
      }

      while (segment[0] === '/') {
        segment = segment.slice(1);
      }

      return segment;
    })
    .filter(segment => {
      return segment.trim() !== '';
    })
    .value();

  return segments.join('/');
}
