import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

export class MicrodataService {

    static getTriplesFromDom(dom: any, uri: string) {

        let queryResponse: QueryResponse = {triples: [], uri: uri, resourceFormat: 'microdata'};
        let triples: Triple[] = [];
        let scopeCounter = 0;

        let parseOneNode = (nodes, _parent: Triple) => {
            let parent: Triple = _parent;
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                if (tag.attribs.hasOwnProperty('itemprop')) {
                    triples.push({
                        subject: parent.subject,
                        predicate: this.getPredicate(tag.attribs.itemprop, parent.object),
                        object: tag.attribs.hasOwnProperty('itemscope') ? this.getObject(tag, uri, scopeCounter) : this.getObject(tag, uri)
                    });
                }
                if (tag.attribs.hasOwnProperty('itemscope')) {
                    scopeCounter++;
                    triples.push({
                        subject: {name: '_:genid' + String(scopeCounter)},
                        predicate: {name: 'rdf-syntax-ns#type', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'},
                        object: this.getObject(tag, uri, 0, parent != null ? parent.object : null)
                    });
                    parent = triples[triples.length - 1];
                }
                if (tag.children) parseOneNode(tag.children, parent);
            });
        }

        parseOneNode(dom, null);

        queryResponse.triples = triples;

        console.log('Processed ' + String(triples.length) + ' ' + queryResponse.resourceFormat + '-Items');

        return new Promise((resolve, reject) => resolve(queryResponse));
    }

    private static getPredicate(itemprop: string, parentObject: TriplePart): TriplePart {
        let name: string = isUrl(itemprop) ? itemprop.split('/')[itemprop.split('/').length - 1] : itemprop;
        let uri: string = isUrl(name) ? name : (parentObject.uri ? this.generatePredicateUrl(parentObject.uri, name) : null);
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static getObject(tag: any, siteUri: string, scopeCounter?: number, parentObject?: TriplePart): TriplePart {
        let name: string;
        let uri = '';

        if (scopeCounter && scopeCounter > 0) {
            name = '_:genid' + String(scopeCounter + 1);
            uri = null;
        } else if (tag.attribs.hasOwnProperty('itemscope') && tag.attribs.hasOwnProperty('itemtype')) {
            name = !isUrl(tag.attribs.itemtype) ? tag.attribs.itemtype :
                tag.attribs.itemtype.split('/')[tag.attribs.itemtype.split('/').length - 1];
            uri = isUrl(tag.attribs.itemtype) ? tag.attribs.itemtype : (
                parentObject != null ? (
                    parentObject.uri ? this.generatePredicateUrl(parentObject.uri, tag.attribs.itemtype) : null
                    ) : null
                );

        } else {
            let isLink = false;

            if (tag.attribs.hasOwnProperty('title'))
                name = tag.attribs.title;
            else if (tag.attribs.hasOwnProperty('content'))
                name = tag.attribs.content;
            else {
                name = '';
                tag.children.filter(node => node.type === 'text').forEach(text => {
                    name += text.data;
                });
            }

            if (tag.attribs.hasOwnProperty('href')) {
                if (!name) name = isUrl(tag.attribs.href) ? tag.attribs.href.split('/')[tag.attribs.href.split('/').length - 1] : tag.attribs.href;
                uri = tag.attribs.href;
                isLink = true;
            } else if (tag.attribs.hasOwnProperty('src')) {
                if (!name) name = tag.attribs.src;
                uri = tag.attribs.src;
                isLink = true;
            }

            if (isLink) {
                if (uri.startsWith('/')) {
                    let temp = uri;
                    uri = '';
                    siteUri.split('/').slice(0, 3).forEach(urlPart => uri += urlPart + '/');
                    uri = uri.slice(0, -1) + temp;
                } else {
                    if (!isUrl(uri)) uri = siteUri.endsWith('/') ? siteUri + uri : siteUri + '/' + uri;
                }
            } else {
                uri = isUrl(name) ? name : null;
            }
        }
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static generatePredicateUrl(uri: string, name: string): string {
        let response = ''
        uri.split('/').slice(0, -1).forEach(urlPart => response = response.concat(urlPart + '/'));
        return response + name;
    }
}
