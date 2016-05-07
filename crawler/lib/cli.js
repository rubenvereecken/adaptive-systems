import args from 'commander';
import pkg from '../package.json';
import Crawler from './crawler';

class CLI {
  constructor() {

  }

  crawl(args) {
    if (args.args.length != 2) {
      console.error('missing argument for crawl')
        args.help();
    }

    const url = args.args[1];
    if (!args.exclude)
      args.exclude = []
    else
      args.exclude = args.exclude.split(',')
    var options = {
      overwrite: args.overwrite || false,
      depth: args.depth,
      excludes: args.exclude.map((re) => new RegExp(re)),
    }
    if (url) {
      // if url valid
      //
      const crawler = new Crawler(options);
      const crawlerPromise = crawler.ready
        .then(() => crawler.startCrawl(url))
        .then((whatever) => { process.exit(0) })
        .catch((err) => {
          console.error(err.stack)
          process.exit(1);
      })

    }
    
  }

  clean(args) {
    console.log('cleaning yay')
    const regexes = args.slice(1);
  }
}

(() => {
  // const package = require('../package.json');
  args
    .version(pkg.version)
    .description(pkg.description)
    .arguments('<action> [url]')
    .option('--exclude <regexes>')
    .option('-o, --overwrite', 'Overwrite found pages')
    .option('-d, --depth <d>', 'Configure crawl depth')
    .parse(process.argv);

  const cli = new CLI();
  const action = args.args[0];
  if (action === 'clean')
    cli.clean(args);
  else if (action === 'crawl')
    cli.crawl(args);
  else {
    console.error('Unknown command ' + args.args[0]);
    process.exit(1);
  }
    
  // process.exit(0);
})();
