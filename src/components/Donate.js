import React from 'react';
import * as Tools from '../utils/Tools';

const cnText = Tools.randomList(['颈椎病晚期', '穷困潦倒', '快交不起房租', '天天加班', '有可能会猝死'], 1)[0];
export default function Donate(props) {
  let text = <h4 className='lang'>给 <a href='https://github.com/liyupi/code-nav' rel='noopener noreferrer' target='_blank'>{cnText}的 @鱼皮</a> 一个 ⭐ 吧️</h4>;
  return (
    <div className='donate'>
      <div className='hd'>{text}</div>
    </div>
  )
}
