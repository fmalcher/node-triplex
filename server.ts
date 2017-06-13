import { createServer, bodyParser, CORS, queryParser, serveStatic, NotFoundError } from 'restify';
import { QueryController } from './src/controllers/query.controller';

const queryController = new QueryController();

let server = createServer({
    formatters: {
        'application/json': function (req, res, body, cb) {
            return cb(null, JSON.stringify(body, null, '  '));
        }
    }
});

server.use(bodyParser());
server.use(CORS({}));
server.use(queryParser());

server.post('/query', queryController.processQuery);

server.listen(3000, () => {
    console.log('Triplex API on %s', server.url);
});
