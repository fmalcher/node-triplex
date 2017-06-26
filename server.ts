import { createServer, bodyParser, CORS, queryParser } from 'restify';
import { QueryController } from './src/controllers/query.controller';

const queryController = new QueryController();

let server = createServer();

server.use(bodyParser());
server.use(CORS({}));
server.use(queryParser());

/*
 * Provide ressource uri for triple requests.
 * If necessary other ressources could be added here in future.
 */
server.post('/query', queryController.processQuery);

// Start server listening in port 3012.
server.listen(3012, () => {
    console.log('Triplex API on %s', server.url + '/query');
});
