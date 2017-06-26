import { Ntriples } from './ntriples.service';
import { RDFaService } from './rdfa.service';
import { MicrodataService } from './microdata.service';
import { QueryResponse } from '../models/query-response';
import * as request from 'request';
import * as htmlparser from 'htmlparser2';

/*
 * Functions called by query.controller.ts
 */

export class RequestService {

    // Get html/plaintext from requested website.
    static readFromUri(uri: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let plaintextOption = {
                url: uri,
                headers: { 'Accept': 'text/plain' }
            };
            request(plaintextOption, (error, response, body) => {
                if (error) reject(400);
                if (this.checkNtriples(body)) resolve(this.findDataTypes(body));
                else request(uri, (error, response, body) => {
                    if (error) reject(400);
                    this.parseHtmlToDom(body)
                    .then(content => this.findDataTypes(content))
                    .then(dataTypes => resolve(dataTypes));
                });
            });
        });
    }

    // Parse html/plaintext to iterable DOM-object.
    private static parseHtmlToDom(body: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let handler = new htmlparser.DomHandler((error, dom) => {
                if (error) reject(422);
                resolve(dom);
            });
            let parser = new htmlparser.Parser(handler);
            parser.write(body);
            parser.end();
        });
    }

    // Find all semantic data types in html/plaintext.
    static findDataTypes(content: any): Promise<any> {

        // IN FUTURE: EXTEND THIS INTERFACE FOR MORE DATA TYPES!
        interface Data {
            content: any;
            containsMicrodata: boolean;
            containsRDFa: boolean;
            containsNtriples: boolean;
        }

        // IN FUTURE: EXTEND THIS FUNTION FOR MORE OR PRECISED DATA TYPE TESTS!
        return new Promise((resolve, reject) => {
            let dataTypes: Data = {content: content, containsMicrodata: false, containsRDFa: false, containsNtriples: false};
            // Content is type of HTML
            if (typeof(content) == 'object') {
                let hasItemscope = false;
                let hastItemtype = false;
                let hasItemprop = false;
                let hasTypeof = false;
                let hasProperty = false;
                let testNodes = (nodes: any[]) => {
                    nodes.filter(n => n.type === 'tag').forEach(tag => {

                        // Test for Microdata
                        if (tag.attribs.hasOwnProperty('itemscope')) hasItemscope = true;
                        if (tag.attribs.hasOwnProperty('itemtype')) hastItemtype = true;
                        if (tag.attribs.hasOwnProperty('itemprop')) hasItemprop = true;
                        if (hasItemscope && hastItemtype && hasItemprop) dataTypes.containsMicrodata = true;

                        // Test for RDFa
                        if (tag.attribs.hasOwnProperty('typeof')) hasTypeof = true;
                        if (tag.attribs.hasOwnProperty('property')) hasProperty = true;
                        if (hasTypeof && hasProperty) dataTypes.containsRDFa = true;

                        if (tag.children) testNodes(tag.children);
                    });
                }
                testNodes(content);
            } else {
                // Content is type of Plaintext
                dataTypes.containsNtriples = true;
                // dataTypes.containsNtriples = this.checkNtriples(content);
            }
            resolve(dataTypes);
        });
    }

    /*
     * This function calls the triple generation algorithms for microdata, RDFa and n-triples.
     * IN FUTURE: EXTEND THIS FUNCTION FOR MORE DATA TYPES!
     */
    static generateResponse(dataTypes, uri: string): Promise<QueryResponse[]> {
        let promises: Promise<QueryResponse>[] = [];

        // Microdata
        if (dataTypes.containsMicrodata) {
            let p = MicrodataService.getTriplesFromDom(dataTypes.content, uri);
            promises.push(p);
        }

        // RDFa
        if (dataTypes.containsRDFa) {
            let p = RDFaService.getTriplesFromDom(dataTypes.content, uri);
            promises.push(p);
        }

        // N-Triple
        if (dataTypes.containsNtriples) {
            let p = Ntriples.getTriplesFromContent(dataTypes.content, uri);
            promises.push(p);
        }

        return Promise.all(promises);
    }

    // Checks whether a string contains n-triples or not (every line has to end with a dot).
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
