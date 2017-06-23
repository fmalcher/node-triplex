import { RequestService } from '../services/request.service';

/*
 * Function called by requesting /query ressource.
 * Returns array of query-reponse.ts (containing triple), empty array or http error code.
 */

export class QueryController {
    processQuery(req, res, next) {
        RequestService.readFromUri(req.body)
        .then(content => { if (content) return RequestService.findDataTypes(content) })
        .then(dataTypes => { if (dataTypes) return RequestService.generateResponse(dataTypes, req.body) })
        .then(response => { if (response) return res.json(response) })
        .catch(error => res.send(error));
    }
}
