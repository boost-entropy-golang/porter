import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  activeValue: string,
  options: { value: string, label: string }[],
  setActiveValue: (x: string) => void,
  width: string,
  dropdownLabel?: string,
  dropdownWidth?: string,
  dropdownMaxHeight?: string,
  closeOverlay?: boolean
};

type StateType = {
};

export default class Selector extends Component<PropsType, StateType> {
  state = {
    expanded: false
  }

  handleOptionClick = (option: { value: string, label: string }) => {
    this.props.setActiveValue(option.value);
    this.props.closeOverlay ? null : this.setState({ expanded: false });
  }

  renderOptionList = () => {
    let { options, activeValue } = this.props;
    return options.map((option: { value: string, label: string }, i: number) => {
      return (
        <Option
          key={i}
          selected={option.value === activeValue}
          onClick={() => this.handleOptionClick(option)}
          lastItem={i === options.length - 1}
        >
          {option.label}
        </Option>
      );
    });
  }

  renderDropdown = () => {
    if (this.state.expanded) {
      return (
        <div>
          {this.props.closeOverlay ? <CloseOverlay onClick={() => this.setState({ expanded: false })} /> : null}
          <Dropdown
            dropdownWidth={this.props.dropdownWidth ? this.props.dropdownWidth : this.props.width}
            dropdownMaxHeight={this.props.dropdownMaxHeight}
          >
            <DropdownLabel>
              {this.props.dropdownLabel}
            </DropdownLabel>
            {this.renderOptionList()}
          </Dropdown>
        </div>
      )
    }
  }

  getLabel = (value: string): any => {
    let tgt = this.props.options.find((element: { value: string, label: string }) => element.value === value);
    if (tgt) {
      return tgt.label;
    }
  }

  render() {
    let { activeValue } = this.props;
    return (
      <StyledSelector>
        <MainSelector
          onClick={() => this.setState({ expanded: !this.state.expanded })}
          expanded={this.state.expanded}
          width={this.props.width}
        >
          <TextWrap>
            {activeValue === '' ? 'All' : this.getLabel(activeValue)}
          </TextWrap>
          <i className="material-icons">arrow_drop_down</i>
        </MainSelector>
        {this.renderDropdown()}
      </StyledSelector>
    );
  }
}

const TextWrap = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DropdownLabel = styled.div`
  font-size: 13px;
  color: #ffffff44;
  font-weight: 500;
  margin: 10px 13px;
`;

const Option = styled.div` 
  width: 100%;
  border-bottom: 1px solid ${(props: { selected: boolean, lastItem: boolean }) => props.lastItem ? '#ffffff00' : '#ffffff15'};
  height: 35px;
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: { selected: boolean, lastItem: boolean }) => props.selected ? '#ffffff11' : ''};

  :hover {
    background: #ffffff22;
  }
`;

const CloseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 5px);
  background: #26282f;
  width: ${(props: { dropdownWidth: string, dropdownMaxHeight: string }) => props.dropdownWidth};
  max-height: ${(props: { dropdownWidth: string, dropdownMaxHeight: string }) => props.dropdownMaxHeight ? props.dropdownMaxHeight : '300px'};
  padding-bottom: 10px;
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px 0px #00000055;
`;

const StyledSelector = styled.div`
  position: relative;
`;

const MainSelector = styled.div`
  width: ${(props: { expanded: boolean, width: string }) => props.width};
  height: 30px;
  border: 1px solid #ffffff55;
  font-size: 13px;
  padding: 5px 10px;
  padding-left: 12px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: ${(props: { expanded: boolean, width: string }) => props.expanded ? '#ffffff33' : '#ffffff11'};
  :hover {
    background: ${(props: { expanded: boolean, width: string }) => props.expanded ? '#ffffff33' : '#ffffff22'};
  }

  > i {
    font-size: 20px;
    transform: ${(props: { expanded: boolean, width: string }) => props.expanded ? 'rotate(180deg)' : ''};
  }
`;