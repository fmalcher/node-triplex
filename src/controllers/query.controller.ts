import { NotFoundError, BadRequestError, InternalError } from 'restify';
import { RequestService } from '../services/request.service';

export class QueryController {

    processQuery(req, res, next) {
        RequestService.readFromUri(req.body)
            .catch(error => res.writeHead(error))
                .then(content => { if (content)
                    return RequestService.findDataTypes(content) })
                    .catch(error => res.writeHead(error))
                        .then(dataTypes => { if (dataTypes)
                            return RequestService.generateResponse(dataTypes, req.body) })
                            .catch(error => res.writeHead(error))
                                .then(response => { if (response)
                                    return res.json(response) });
    }
}
