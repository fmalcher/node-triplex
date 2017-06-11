import { NotFoundError, BadRequestError, InternalError } from 'restify';

import { RequestService } from '../services/request.service';
import { ContentType } from '../content-type';

export class QueryController {
    processQuery(req, res, next) {
        // zeuch einlesen
        // Typ feststellen
        // je nach Typ die Tripel extrahieren
        RequestService.readFromUri(req.body)
            .then(data => {
                res.send({
                    data: data
                });
            });
    }
}
