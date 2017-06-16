import { RDFaService } from './rdfa.service';
import { MicrodataService } from './microdata.service';
import { QueryResponse } from '../models/query-response';
import * as request from 'request';
import * as htmlparser from 'htmlparser2';

export class RequestService {

    static readFromUri(uri: string): Promise<string> {
        return new Promise((resolve, reject) => {
            request(uri, (error, response, body) => {
                if (error) reject(error);
                resolve(body);
            });
        });
    }

    static parseHtmlToDom(rawHtml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let handler = new htmlparser.DomHandler((error, dom) => {
                if (error) reject(error);
                resolve(dom);
            });
            let parser = new htmlparser.Parser(handler);
            parser.write(rawHtml);
            parser.end();
        });
    }

    static findDataTypes(content: string): Promise<any> {

        interface DataTypes {
            content: string;
            isMicrodata: boolean;
            isRDFa: boolean;
        }

        return new Promise((resolve, reject) => {
            let dataTypes: DataTypes = {content: content, isMicrodata: false, isRDFa: false};
            let handler = new htmlparser.DomHandler((error, dom) => {
                // HTML content
                if (!error) {
                    if (content.includes('itemscope') && content.includes('itemtype') && content.includes('itemprop'))
                        dataTypes.isMicrodata = true;
                    if (content.includes('vocab') && content.includes('typeof') && content.includes('property'))
                        dataTypes.isRDFa = true;
                } else { // JSON content
                    // TODO
                }
                if (!dataTypes.isMicrodata && !dataTypes.isRDFa) reject('TODO ERROR 1');
                else resolve(dataTypes);
            });
            let parser = new htmlparser.Parser(handler);
            parser.write(content);
            parser.end();
        });
    }

    static generateResponse(dataTypes, uri: string): Promise<QueryResponse[]> {
        let promises: Promise<QueryResponse>[] = [];

        if (dataTypes.isMicrodata) {
            let p = this.parseHtmlToDom(dataTypes.content)
                .then(dom => MicrodataService.getTriplesFromDom(dom, uri));
            promises.push(p);
        }

        if (dataTypes.isRDFa) {
            let p = this.parseHtmlToDom(dataTypes.content)
                .then(dom => RDFaService.getTriplesFromDom(dom, uri));
            promises.push(p);
        }

        return Promise.all(promises);
    }
}




