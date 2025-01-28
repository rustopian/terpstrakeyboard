/*
QueryData.ts

A function to parse data from a query string

Originally created (in JS, not TS) by Stephen Morley - http://code.stephenmorley.org/ - and released under
the terms of the CC0 1.0 Universal legal code:

http://creativecommons.org/publicdomain/zero/1.0/legalcode

*/

export class QueryData {
  [key: string]: any;

  constructor(queryString?: string, array = false) {
    if (queryString === undefined) {
      queryString = location.search ? location.search : "";
    }
    
    if (queryString.charAt(0) === "?") {
      queryString = queryString.substring(1);
    }
    
    if (queryString.length > 0) {
      queryString = queryString.replace(/\+/g, " ");
      const params = queryString.split(/[&;]/g);
      
      for (let i = 0; i < params.length; i++) {
        const param = params[i].split("=");
        const key = decodeURIComponent(param[0]);
        const value = param.length > 1 ? decodeURIComponent(param[1]) : "";
        
        if (array) {
          if (!(key in this)) {
            this[key] = [];
          }
          (this[key] as string[]).push(value);
        } else {
          this[key] = value;
        }
      }
    }
  }
} 