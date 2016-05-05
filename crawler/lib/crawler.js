require('./db').setup();
import Page from './page';
import request from 'request-promise';
import cheerio from 'cheerio';
import _ from 'lodash';
import Promise from 'bluebird';


export default class Crawler {
  constructor(options) {
    this.opt = options;
    _.defaults(this.opt, Crawler.defaults);
    console.log(options);

    this.visited = {};
    this.isFullURLRegex = /^http/;
    this.protocolRegex = /^.+:\/\//;
    this.baseRegex = /^.+:\/\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+/;
    this.idRegex = /^\#/;
    this.mailtoRegex = /^mailto/;
    this.trailingIdRegex = /\#[A-Za-z0-9_:\.-]+$/;
    this.trailingSlashRegex = /\/$/;
    this.urlRegex = /^https?:\/\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+/;

    if (!this.opt.overwrite)
      this.ready = this.prepareVisited();
    else {
      this.ready = new Promise((resolve) => { resolve() });
    }
  }

  static get defaults() {
    return {
      depth: Infinity,
      consolidateProtocol: true,
      attempts: 3,
    };
  }

  prepareVisited() {
    return Page.find().exec().then((pages) => {
      pages.forEach((page) => {
        this.visited[page.url] = true;
      });
      console.log(this.visited);
    });
  }

  normalizeURL(url, origin) {
    // if (url.match(/\?$/))
    //   console.log(url);
    if (url.match(this.isFullURLRegex)) {
    } else if (url.match(/^\//)) {
      var base = origin.match(this.baseRegex);
      if (!base)
        throw new Error('wtf is this ' + origin)
      url = base[0] + url;
    } else {
      // console.log('RELATIVE PATH ' + url);
      url = origin + '/' + url;
    }
    url = url.replace(this.trailingIdRegex, '');
    url = url.replace(this.trailingSlashRegex, '');
    url = url.replace(/^https/, 'http');
    return url;
  }

  isURL(url) {
    return (url && !(
      url.match(this.idRegex) ||
      url.match(this.mailtoRegex) ||
      url.match(/^javascript/)
    ) && (!url.match(this.isFullURLRegex) || url.match(this.urlRegex)) );
  }

  justTheDomain(url) {
    var base = url.match(this.baseRegex);
    if (!base)
      throw new Error('wtf is this ' + url)
    return base[0].replace(this.protocolRegex, '');
  }

  sameOrigin(url, origin) {
    return this.justTheDomain(url) === this.justTheDomain(origin);
  }

  shouldCrawl(url) {
    return !url.match(/(\.(ppt)|(pptx)|(pdf))$/);
  }

  crawl(url, depth=this.opt.depth, attempts=this.opt.attempts) {
    var that = this;
    var origin = url;
    const normalizedOrigin = this.normalizeURL(origin);

    if (this.visited[normalizedOrigin]) {
      return;
    } else {
      // for when multithreaded
      this.visited[normalizedOrigin] = true;
    }
    console.log(normalizedOrigin);
    var page = {
      url: normalizedOrigin,
    };

    if (!this.shouldCrawl(normalizedOrigin)) {
      page.links = [];
      return Page.findOne({url: page.url}).remove()
                 .then(Page(page).save())
    }

    return request({ 
      uri: normalizedOrigin,
      transform: (body) => cheerio.load(body),
    }).then(($) => {
      var goodLinks = [];
      var links = $('a');

      $(links).each((i, link) => {
        var url = $(link).attr('href');
        if (!this.isURL(url)) return;

        const normalizedURL = this.normalizeURL(url, origin);
        if (!this.sameOrigin(normalizedURL, normalizedOrigin)) return;
        goodLinks.push(normalizedURL);
      });

      var page = {
        url: normalizedOrigin,
        links: goodLinks,
      };

      var savePagePromise = Page.findOne({url: normalizedOrigin}).remove()
        .then(Page(page).save)
        // .then(() => { console.log(`${page.url} saved successfully`) });

      var crawlPromises = [];

      if (depth > 0) {
        $(goodLinks).each(function(i, link) {
          crawlPromises.push(that.crawl(link, depth-1));
        });
      }

      return Promise.all(_.concat(crawlPromises, savePagePromise));
    }).catch((err) => {
      var page = {
        url: normalizedOrigin,
        error: err,
      };
      if (err.statusCode || attempts <= 1) {
        return Page.findOne({url: normalizedOrigin}).remove()
          .then(Page(page).save);
      } else {
        return that.crawl(normalizedOrigin, depth, attempts-1);
      }
    });
  }
}
