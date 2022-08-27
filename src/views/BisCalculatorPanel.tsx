import * as React from 'react';
import * as mobx from 'mobx';
import * as mobxReact from 'mobx-react-lite';
import * as classNames from 'classnames';
import { Tab, TabBar } from '@rmwc/tabs';
import { Switch } from '@rmwc/switch';
import * as G from '../game';
import { useStore } from './components/contexts';
import { TextField } from '@rmwc/textfield';
import { List, ListItem } from '@rmwc/list';
import { Radio } from '@rmwc/radio';
import { Button } from '@rmwc/button';
import { DropdownPopperProps } from './components/Dropdown';

const GCD_MIN = 150
const GCD_MAX = 250

export const BisCalculatorPanel = mobxReact.observer<DropdownPopperProps>(({toggle}) => {
  const store = useStore();
  const [alertMessage, setAlertMessage] = React.useState('')
  return (
    <div className="setting card">
      <div className='setting_section'>
        {/* <span className="setting_sub">从当前范围内寻找每威力伤害期望最高的配置。例如计算6.2开荒装备，推荐筛选范围为610-615（HQ+普通难度+极神武器），额外点数装备推荐预先选择好，然后勾选保留已选择内容进行计算。</span> */}
        <span className="setting_title">计算当前装备下每威力伤害期望最高的镶嵌方案</span>
      </div>
      <div className="setting_section">
        <span className="setting_title">期望GCD</span>
        <span className="setting_sub">GCD范围为1.5s-2.5s。如果当前装备下无法达到期望GCD则会尽量靠近。</span>
      </div>
      <div className="setting_controls">
        <GcdInput value={store.bisExpectedGcd} onChange={v => store.setExpectedGcd(v)}/>
      </div>
      <div className="setting_section">
        <span className="setting_title">优先使用食物提供技速/咏速</span>
        <span className="setting_sub">不建议开启，会影响最优方案选择</span>
      </div>
      <div className="setting_controls">
        <Radio
          label="使用"
          checked={store.bisFoodForSpeed}
          onChange={() => store.setBisFoodForSpeed(true)}
        />
        <Radio
          label="不使用"
          checked={!store.bisFoodForSpeed}
          onChange={() => store.setBisFoodForSpeed(false)}
        />
      </div>
      {/* <div className="setting_section">
        <span className="setting_title">保留已选择的内容进行计算</span>
        <span className="setting_sub">魔晶石不会被保留</span>
      </div>
      <div className="setting_controls">
        <Radio
          label="保留"
          checked={store.bisKeepCurrent}
          onChange={() => store.setBisKeepCurrent(true)}
        />
        <Radio
          label="不保留"
          checked={!store.bisKeepCurrent}
          onChange={() => store.setBisKeepCurrent(false)}
        />
      </div>
      <div className="setting_section">
        <span className="setting_title">使用华美衣服（天书奇谈奖励）</span>
        <span className="setting_sub">可插五孔顶级石头</span>
      </div>
      <div className="setting_controls">
        <Radio
          label="使用"
          checked={store.bisUseOrnate}
          onChange={() => store.setBisUseOrnate(true)}
        />
        <Radio
          label="不使用"
          checked={!store.bisUseOrnate}
          onChange={() => store.setBisUseOrnate(false)}
        />
      </div> */}
      <div className="setting_section">
        <span className="setting_sub" style={{
          color: 'red'
        }}>{alertMessage}</span>
      </div>
      <Button onClick={() => {
        setAlertMessage('')
        let hasGears = false
        for (const gear of store.equippedGears.values()) {
          if (!gear?.isFood) {
            hasGears = true
            break
          }
        }
        if (!hasGears) {
          setAlertMessage('还没选择装备，请先选择想要使用的装备后再开始计算。')
        } else {
          store.calculateBisMeld()
          toggle()
          // window.location.replace(store.shareUrl)
        }
      }}>开始计算</Button>
    </div>
  );
});

// 使用*100的整型存储gcd数据，展示时直接插入小数点字符绕过精度问题
function displayGcd(gcd: number) {
  const string = gcd.toString()
  return string.substring(0, string.length - 2) + '.' + string.substring(string.length - 2)
}

function parseGcd(gcd: string) {
  return parseInt(gcd.replace('.', ''))
}

const GcdInput = (() => {
  let anyInstanceFocused = false;
  let delayedChange: Function | null = null;
  return mobxReact.observer<{
    value: number,
    onChange: (value: number) => void,
  }>(({ value, onChange }) => {
    const [ inputValue, setInputValue ] = React.useState(displayGcd(value));
    const [ prevValue, setPrevValue ] = React.useState(value);
    if (value !== prevValue) {
      setInputValue(displayGcd(value));
      setPrevValue(value);
    }
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (e.deltaY !== 0) {
          (e.target as HTMLInputElement).focus();
          const delta = e.deltaY < 0 ? 1 : -1;
          setInputValue(v => displayGcd((parseGcd(v) + delta)));
        }
      };
      const input = inputRef.current!;
      input.addEventListener('wheel', handleWheel, { passive: false });
      return () => input.removeEventListener('wheel', handleWheel);
    }, []);
    const handleChange = () => {
      let value = parseGcd(inputValue) || 0
      value = Math.min(value, GCD_MAX)
      value = Math.max(value, GCD_MIN)
      if (displayGcd(value) !== inputValue) {
        setInputValue(displayGcd(value))
      }
      onChange(value);
    }
    return (
      <TextField
        inputRef={inputRef}
        value={inputValue}
        suffix={'s'}
        className={'bis-calc-input'}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setInputValue(e.target.value);
        }}
        onFocus={e => {
          e.target.select();
          anyInstanceFocused = true;
        }}
        onBlur={() => {
          setTimeout(() => {
            if (!anyInstanceFocused) {
              mobx.runInAction(() => {
                delayedChange?.();
                delayedChange = null;
                handleChange();
              });
            } else {
              delayedChange = handleChange;
            }
          }, 0);
          anyInstanceFocused = false;
        }}
        onKeyPress={e => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    );
  });
})();
