import { NotFoundError, BadRequestError, InternalError } from 'restify';
import { RequestService } from '../services/request.service';

export class QueryController {

    processQuery(req, res, next) {
        RequestService.readFromUri(req.body)
            .then(content => RequestService.findDataTypes(content))
            .then(dataTypes => RequestService.generateResponse(dataTypes, req.body))
            .then(response => res.json(response));
    }
}
