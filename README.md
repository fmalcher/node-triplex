# node-triplex

This is the Backend of *Triplex*. This Software extracts semantic triples placed in HTML-content like Microdata and RDFa.
Furthermore it provides the processing of N-Triples.

To get the Web-Frontend please visit [https://gitlab.imn.htwk-leipzig.de/fmalcher/ng-triplex](https://gitlab.imn.htwk-leipzig.de/fmalcher/ng-triplex)

This project was generated with Node.js version 8.1.0.

## Development server

Execute the following commands to configure the backend:

```
git clone https://gitlab.imn.htwk-leipzig.de/fmalcher/node-triplex
cd node-iltis
npm install
```

Start the server via the following command:

```
npm start
```

## Requesting Data without the web-frontend
* Create a new http post-request fur the URI [http://localhost:3000/query](http://localhost:3000/query)
* The body of your request should contain the URI of the website you are interested in extracting its semantic triples.