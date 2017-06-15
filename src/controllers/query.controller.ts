import { NotFoundError, BadRequestError, InternalError } from 'restify';

import { RequestService } from '../services/request.service';
import { MicrodataService } from '../services/microdata.service';

export class QueryController {
    processQuery(req, res, next) {
        RequestService.readFromUri(req.body)
            .then(html => RequestService.parseHtmlToDom(html))
            .then(dom => MicrodataService.getTriplesFromDom(dom, req.body))
            .then(response => res.json(response));
    }
}
