import { NotFoundError, BadRequestError, InternalError } from 'restify';
import { RequestService } from '../services/request.service';

export class QueryController {

    processQuery(req, res, next) {
        RequestService.readFromUri(req.body)
        .then(content => { if (content) return RequestService.findDataTypes(content) })
        .then(dataTypes => { if (dataTypes) return RequestService.generateResponse(dataTypes, req.body) })
        .then(response => { if (response) return res.json(response) })
        .catch(error => res.send(error));
    }
}
