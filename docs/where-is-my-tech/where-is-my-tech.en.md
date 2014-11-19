# How borschik Resolves Technologies

borschik resolves technology's path in following order

1. If path starts with `/` or `.`, borschik uses given path. Example: `borschik -t ./my-tech/tech.js -i my-file.ext`
2. Try to load tech from `borschik/lib/techs/<given technology>`. Example: `borschik -t css -i my-file.css`
3. If no, try to load `borschik-tech-<given technology>` npm package. This example loads 'borschik-tech-js-coffee' npm package: `borschik -t js-coffee -i my-file.coffee`
