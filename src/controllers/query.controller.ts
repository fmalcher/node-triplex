import { RequestService } from '../services/request.service';

/*
 * Function called by requesting /query ressource.
 * Returns array of query-reponse.ts (containing triple), empty array or http error code.
 */

export class QueryController {
    processQuery(req, res, next) {
        RequestService.readFromUri(req.body)
        .then(dataTypes => { if (dataTypes) return RequestService.generateResponse(dataTypes, req.body) })
        .then(response => { if (response) return res.json(response) })
        .catch(error => res.send(error));
    }

    processRoot (req, res, next) {
        let body = `<html>
                        <head>
                            <title>Triplex</title>
                        </head>
                        <body>
                            This is the api of triplex.<br>
                            See the source code at <a href="https://github.com/triplex-browser/node-triplex">https://github.com/triplex-browser/node-triplex</a> for more information.
                        <body>
                    </html>`;
        res.writeHead(200, {
            'Content-Length': Buffer.byteLength(body),
            'Content-Type': 'text/html'
        });
        res.write(body);
        res.end();
    }
}
