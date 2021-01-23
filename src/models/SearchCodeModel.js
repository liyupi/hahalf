import BaseModel from './BaseModel';
import * as Tools from '../utils/Tools';
import YoudaoTranslateData from './metadata/YoudaoTranslateData';
import BaiduTranslateData from './metadata/BaiduTranslateData';
import BingTranslateData from './metadata/BingTranslateData';
import Store from './Store';
import AppModel from './AppModel';
import {SessionStorage} from '../utils/LocalStorage';
import * as Configs from '../constants/Configs';

const SEARCH_LANG_KEY = `${Configs.APP_NANE}_search_lang_key`;

class SearchCodeModel extends BaseModel {
  constructor() {
    super();
    this._data = {
      isZH: false,
      searchValue: null,
      searchLang: SessionStorage.getItem(SEARCH_LANG_KEY),
      page: 0,
      variableList: [],
      suggestion: [],
      sourceCode: null
    };
    this._variableRepoMapping = {};
    this._sourceCodeStore = new Store(Infinity);
    this._variableListStore = new Store(Infinity, {
      persistence: 'session',
      persistenceKey: AppModel.genPersistenceKey('variable_list_key')
    });
    const translators = [YoudaoTranslateData, YoudaoTranslateData, YoudaoTranslateData, BaiduTranslateData, BingTranslateData];
    this._translator = translators[new Date().getSeconds() % translators.length];
  }

  //search code by query
  async requestVariable(val, page, lang) {
    lang = lang || this.searchLang;
    SessionStorage.setItem(SEARCH_LANG_KEY, lang); // persist lang
    if (val !== undefined && val !== null) {
      val = val.trim().replace(/\s+/ig, ' '); // filter spaces
    }
    if (val.length < 1) {
      return;
    }
    let q = val;
    const url = `https://pic.sogou.com/pics/json.jsp?query=${q}`;
    const done = data => {
      const cdata = {
        searchValue: val,
        page: page,
        variableList: [...this._data.variableList, data.items],
        searchLang: lang,
      };
      this.update(cdata);
    };
    val && fetch(`https://bird.ioliu.cn/v1?url=${url}`)
      .then(res => res.json())
      .then(done)
      .catch(() => {
        this.update({
          searchValue: val,
          page: page,
          variableList: [...this.variableList, []],
          searchLang: lang,
        });
      });
  }

  //get source code by id
  requestSourceCode(id) {
    const cache = this._sourceCodeStore.get(id);
    if (cache) {
      this.update({sourceCode: cache});
      return;
    }
    id && fetch('https://searchcode.com/api/result/' + id + '/')
      .then(res => res.json())
      .then(data => {
        this._sourceCodeStore.save(id, data.code);
        this.update({sourceCode: data.code});
      });
  }

  getKeyWordReg(keyword) {
    return new RegExp('([\\-_\\w\\d\\/\\$]{0,}){0,1}' + keyword + '([\\-_\\w\\d\\$]{0,}){0,1}', 'gi');
  }

  getKeyWroddRegs(keywords) {
    return keywords.split(' ').reduce((accumulator, curr) => {
      if (curr.length && curr.length > 1) {
        return accumulator.concat(this.getKeyWordReg(curr));
      }
      return accumulator;
    }, []);
  }

  _parseVariableList(results, keywords) {
    let vals = [], variables = [];
    results.forEach(res => {
      res.repo = res.repo.replace('git://github.com', 'https://github.com');
      //filter codes
      const lineStr = Object.keys(res.lines).reduce((accu, line) => {
        let lstr = res.lines[line];
        //no base64
        if (!(/;base64,/g.test(lstr) && lstr.length > 256)) {
          return accu.concat(lstr);
        }
        return accu;
      }, []).join('').replace(/\r\n/g, ' '); // remove \r\n
      //match variables
      this.getKeyWroddRegs(keywords).forEach(reg => {
        (lineStr.match(reg) || []).forEach(val => {
          //remove "-" and "/" from the start and the end
          val = val.replace(/^(\-|\/)*/, '').replace(/(\-|\/)*$/, '');
          this._updateVariableRepoMapping(val, res);
          if (
            !/\//g.test(val) /*exclude links*/
            && vals.indexOf(val) === -1
            && vals.indexOf(val.toLowerCase()) === -1
            && vals.indexOf(val.toUpperCase()) === -1
            && val.length < 64 /*too long*/
          ) {
            vals.push(val);
            variables.push({
              keyword: val,
              repoLink: res.repo,
              repoLang: res.language,
              color: Tools.randomLabelColor()
            });
          }
        });
      });
    });
    return variables.map(val => {
      val.repoList = this._getVariableRepoMapping(val.keyword);
      return val;
    });
  }

  _updateVariableRepoMapping(val, repo) {
    if (!/\//g.test(val) /*exclude links*/ && val.length < 64 /*too long*/) {
      val = `__${val.toLowerCase()}`;
      this._variableRepoMapping[val] = this._variableRepoMapping[val] || [];
      if (!this._variableRepoMapping[val].find(key => key.id == repo.id)) {
        repo.lines = null;
        delete repo.lines;
        this._variableRepoMapping[val].push(repo);
      }
    }
  }

  _getVariableRepoMapping(val) {
    val = `__${val.toLowerCase()}`;
    return this._variableRepoMapping[val];
  }

  _isZH(val) {
    let isZH = false;
    val.replace(/\s+/ig, '+').split('+').forEach((key) => {
      if (/[^\x00-\xff]/gi.test(key)) {
        isZH = true;
      }
    });
    return isZH;
  }

  get searchValue() {
    return this._data.searchValue;
  }

  get searchLang() {
    return this._data.searchLang || SessionStorage.getItem(SEARCH_LANG_KEY) || [];
  }

  get page() {
    return this._data.page;
  }

  get variableList() {
    return this._data.variableList;
  }

  get suggestion() {
    return this._data.suggestion;
  }

  get isZH() {
    return this._data.isZH;
  }

  get sourceCode() {
    return this._data.sourceCode;
  }
}

export default new SearchCodeModel();
