import * as request from 'request';

export class RequestService {

    static readFromUri(uri: string) {
        return new Promise((resolve, reject) => {
            request(uri, (error, response, body) => {
                if (error) reject(error);
                resolve(body);
            });
        });
    }
}




