import { ContentType } from './../content-type';
import { Ntriples } from './ntriples.service';
import { RDFaService } from './rdfa.service';
import { MicrodataService } from './microdata.service';
import { QueryResponse } from '../models/query-response';
import * as request from 'request';
import * as htmlparser from 'htmlparser2';

export class RequestService {

    static readFromUri(uri: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let options = {
                url: uri,
                headers: {
                    'Accept': 'text/plain'
                }
            };
            request(options, (error, response, body) => {
                if (error) reject(400);
                resolve(body);
            });
        });
    }

    static parseHtmlToDom(rawHtml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let handler = new htmlparser.DomHandler((error, dom) => {
                if (error) reject(422);
                resolve(dom);
            });
            let parser = new htmlparser.Parser(handler);
            parser.write(rawHtml);
            parser.end();
        });
    }

    static findDataTypes(content: string): Promise<any> {

        interface Data {
            content: string;
            containsMicrodata: boolean;
            containsRDFa: boolean;
            containsNtriples: boolean;
        }

        return new Promise((resolve, reject) => {
            let dataTypes: Data = {content: content, containsMicrodata: false, containsRDFa: false, containsNtriples: false};
            let handler = new htmlparser.DomHandler((error, dom) => {
                if (error) reject(500);
                if (content.includes('itemscope') && content.includes('itemtype') && content.includes('itemprop'))
                    dataTypes.containsMicrodata = true;
                if (content.includes('typeof') && content.includes('property'))
                    dataTypes.containsRDFa = true;
                dataTypes.containsNtriples = this.checkNtriples(content);
                resolve(dataTypes);
            });
            let parser = new htmlparser.Parser(handler);
            parser.write(content);
            parser.end();
        });
    }

    static generateResponse(dataTypes, uri: string): Promise<QueryResponse[]> {
        let promises: Promise<QueryResponse>[] = [];

        if (dataTypes.containsMicrodata) {
            let p = this.parseHtmlToDom(dataTypes.content)
                .then(dom => MicrodataService.getTriplesFromDom(dom, uri));
            promises.push(p);
        }

        if (dataTypes.containsRDFa) {
            let p = this.parseHtmlToDom(dataTypes.content)
                .then(dom => RDFaService.getTriplesFromDom(dom, uri));
            promises.push(p);
        }

        if (dataTypes.containsNtriples) {
            let p = Ntriples.getTriplesFromContent(dataTypes.content, uri);
            promises.push(p);
        }

        return Promise.all(promises);
    }

    private static checkNtriples(content: string): boolean {
        let lines: string[] = content.split('\n');
        let containsNtriples = true;
        lines.pop();
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].endsWith('.')) {
                containsNtriples = false;
                i = lines.length;
            }
        }
        return containsNtriples;
    }
}
