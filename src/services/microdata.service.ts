import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

/*
 * Microdata-Class: Implements logic for extracting
 * microdata-triples from HTML-DOM.
 */

export class MicrodataService {

    // Function called by request.service.ts - generateResponse()
    static getTriplesFromDom(dom: any, uri: string) {

        let queryResponse: QueryResponse = {triples: [], resourceFormat: 'Microdata'};
        let triples: Triple[] = [];
        let scopeCounter = 0;

        let parseOneNode = (nodes, _parent: Triple) => {
            let parent: Triple = _parent;

            /*
             * For each node in current DOM-hierarchy that has the type "tag" (<tagname/>)
             * test if it has got an element like "itemprop" or "itemscope". If such an element
             * is found, generate new triple an push it to triples array.
             */
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                // itemprop found (predicate). Belongs to a parent triple.
                if (tag.attribs.hasOwnProperty('itemprop') && parent) {
                    triples.push({
                        subject: parent.subject,
                        predicate: this.getPredicate(tag.attribs.itemprop, parent.object),
                        object: tag.attribs.hasOwnProperty('itemscope') ? this.getObject(tag, uri, scopeCounter) : this.getObject(tag, uri)
                    });
                }
                // itemscope found: new triple! This is the new parent triple of its children.
                if (tag.attribs.hasOwnProperty('itemscope')) {
                    scopeCounter++;
                    triples.push({
                        subject: {name: '_:genid' + String(scopeCounter)},
                        predicate: {name: 'rdf-syntax-ns#type', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'},
                        object: this.getObject(tag, uri, 0, parent != null ? parent.object : null)
                    });
                    parent = triples[triples.length - 1];
                }
                // If current node has got child-nodes call parseOneNode() recursively.
                if (tag.children) parseOneNode(tag.children, parent);
            });
        }

        // Start parsing DOM
        parseOneNode(dom, null);

        // Add triples array to reponse.
        queryResponse.triples = triples;

        console.log('Processed ' + String(triples.length) + ' ' + queryResponse.resourceFormat + '-Items');

        return new Promise((resolve, reject) => resolve(queryResponse));
    }

    // Returns the predicate of a triple with its name and uri as TriplePart.
    private static getPredicate(itemprop: string, parentObject: TriplePart): TriplePart {
        // If itemprop is uri set name = uri (string behind last slash).
        let name: string = isUrl(itemprop) ? itemprop.split('/')[itemprop.split('/').length - 1] : itemprop;
        // If itemprop is uri set uri = uri. If not get vocab information from parent object and generate predicate uri.
        let uri: string = isUrl(itemprop) ? itemprop : (parentObject.uri ? this.generatePredicateUrl(parentObject.uri, name) : null);
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    // Returns the object of a triple with its name and uri as TriplePart.
    private static getObject(tag: any, siteUri: string, scopeCounter?: number, parentObject?: TriplePart): TriplePart {
        let name: string;
        let uri = '';

        if (scopeCounter && scopeCounter > 0) {
            /*
             * If scopeCounter is not null and not 0 current object references a child triple.
             * New id of child triple = current id + 1
             */
            name = '_:genid' + String(scopeCounter + 1);
            uri = null;
        } else if (tag.attribs.hasOwnProperty('itemscope') && tag.attribs.hasOwnProperty('itemtype')) {
            /*
             * If current tag contains "itemtype" and "itemscope" it is a new parent triple.
             * Object contains uri and name to rdf-syntax-ns#type.
             * Same logic like in getPredicate()-Function.
             */
            name = !isUrl(tag.attribs.itemtype) ? tag.attribs.itemtype :
                tag.attribs.itemtype.split('/')[tag.attribs.itemtype.split('/').length - 1];
            uri = isUrl(tag.attribs.itemtype) ? tag.attribs.itemtype : (
                parentObject != null ? (
                    parentObject.uri ? this.generatePredicateUrl(parentObject.uri, tag.attribs.itemtype) : null
                    ) : null
                );

        } else {
            /*
             * If tag is neither referencing another triple nor being a new parent triple
             * extract content information.
             */
            let isLink = false;

            if (tag.attribs.hasOwnProperty('title'))
                name = tag.attribs.title;
            else if (tag.attribs.hasOwnProperty('content'))
                name = tag.attribs.content;
            else {
                // Extract plaintext
                name = '';
                tag.children.filter(node => node.type === 'text').forEach(text => {
                    name += text.data;
                });
            }

            // If contains "href" or "src" element set name (if name is null) and uri.
            if (tag.attribs.hasOwnProperty('href')) {
                if (!name) name = isUrl(tag.attribs.href) ? tag.attribs.href.split('/')[tag.attribs.href.split('/').length - 1] : tag.attribs.href;
                uri = tag.attribs.href;
                isLink = true;
            } else if (tag.attribs.hasOwnProperty('src')) {
                if (!name) name = isUrl(tag.attribs.src) ? tag.attribs.src.split('/')[tag.attribs.src.split('/').length - 1] : tag.attribs.src;
                uri = tag.attribs.src;
                isLink = true;
            }

            // Handling absolute and relative uri.
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

        if (uri) {
            // If name is null or name is empty (or if it just contains "\r", "\n", "\t"), set name = uri (string behind last slash).
            if (!name || name.replace(/(\r|\n|\t| )/g, '').length == 0) name = uri.split('/')[uri.split('/').length - 1];
            return {name: name, uri: uri};
        } else return {name: name};
    }

    // Remove string behind last slash in uri and combine it with the name.
    private static generatePredicateUrl(uri: string, name: string): string {
        let response = ''
        uri.split('/').slice(0, -1).forEach(urlPart => response = response.concat(urlPart + '/'));
        return response + name;
    }
}
