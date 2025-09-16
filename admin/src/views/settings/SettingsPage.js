import React, { useState } from 'react';
import { Container, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import classnames from 'classnames';
import Header from 'components/Headers/Header.js';
import BrandingSettings from './BrandingSettings';
import BranchSettings from '../../features/branch-management/BranchSettings';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('branding');

  const toggle = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Nav pills className="mb-3 bg-white px-3 py-2 rounded shadow-sm">
              <NavItem>
                <NavLink
                  href="#"
                  className={classnames({ active: activeTab === 'branding' })}
                  onClick={(e)=>{ e.preventDefault(); toggle('branding'); }}
                >
                  <i className="ni ni-atom mr-2 text-indigo" /> Branding
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  href="#"
                  className={classnames({ active: activeTab === 'branch' })}
                  onClick={(e)=>{ e.preventDefault(); toggle('branch'); }}
                >
                  <i className="ni ni-settings-gear-65 mr-2 text-green" /> Branch
                </NavLink>
              </NavItem>
            </Nav>

            <TabContent activeTab={activeTab}>
              <TabPane tabId="branding">
                <BrandingSettings embedded />
              </TabPane>
              <TabPane tabId="branch">
                <BranchSettings embedded />
              </TabPane>
            </TabContent>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default SettingsPage;
