import { createServer, bodyParser, CORS, queryParser, serveStatic, NotFoundError } from 'restify';
import { QueryController } from './src/controllers/query.controller';

const queryController = new QueryController();

let server = createServer();

server.use(bodyParser());
server.use(CORS({}));
server.use(queryParser());

server.post('/query', queryController.processQuery);

server.listen(3000, () => {
    console.log('Triplex API on %s', server.url + '/query');
});
