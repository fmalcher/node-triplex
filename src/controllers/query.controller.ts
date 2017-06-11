import { NotFoundError, BadRequestError, InternalError } from 'restify';

import { RequestService } from '../services/request.service';
import { MicrodataService } from '../services/microdata.service';
import { ContentType } from '../content-type';

export class QueryController {
    processQuery(req, res, next) {

        RequestService.readFromUri(req.body)
            .then(data => MicrodataService.parseHtmlToDom(data))
            .then(dom => MicrodataService.getTriplesFromDom(dom))
            .then(triples => {
                res.send(triples);
            });
    }
}
