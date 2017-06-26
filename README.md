# node-triplex

This is the Backend of *Triplex*. It extracts semantic triples placed in HTML-content like Microdata and RDFa.
Furthermore it provides the processing of N-Triples.

To get the Web-Frontend please visit [https://github.com/triplex-browser/ng-triplex.git](https://github.com/triplex-browser/ng-triplex.git)

We serve a running version for you at [http://triplex.work](http://triplex.work)

*This project was generated with Node.js version 8.1.0.*

## Development server

Execute the following commands to configure the backend:

```
git clone https://github.com/triplex-browser/node-triplex.git
cd node-iltis
npm install
```

Start the server via the following command:

```
npm start
```

## Requesting Data without web-frontend
* Create a new http post-request for [http://localhost:3012/query](http://localhost:3000/query)
* The body of your request should contain the URI of the website you are interested in extracting its semantic triples.

## Developing or implementation of new parsing algorithms
* If you like to improve parsing algorithms of *Triplex* please modify the existing classes (<code>microdata.service.ts</code>, <code>rdfa.service.ts</code> and <code>ntriples.service.ts</code>) in <code>src/services</code>.
    * Each of them is proof of concept.
    * Especially the RDFa code has huge room for improvement.
    * For better results you should implement existing triple parsers (hava a look at [https://www.npmjs.com/search?q=rdfa](https://www.npmjs.com/search?q=rdfa)).
* If you like to implement new semantic triple parsers please add a new service class in <code>src/services</code> (for example <code>json-ld.service.ts</code>) and modify the methods tagged with the following comment in <code>src/services/request.service.ts</code>.
```js
   // MODIFY FOR MORE TYPES
```
