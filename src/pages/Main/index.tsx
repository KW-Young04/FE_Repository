import React from 'react';
import './style.css';
import codeeIllust from '../../assets/images/Codee_illust.png';

const Main = () => {
  return (
    <div className="main-container">
      <div className="content-wrapper">
        {/* 왼쪽 텍스트 섹션 */}
        <section className="text-section">
          <h1 className="title">
            GitHub 기반<br />
            UI/UX 분석 & 코드 개선
          </h1>
          <p className="description">
            저장소를 연결하면 실제 화면과 코드를 함께 분석해<br />
            접근성 문제를 찾아드립니다.
          </p>

          <div className="feature-grid">
            <div className="feature-item">
              <span className="check-icon">✓</span> 코드 + 렌더링 화면 기반 분석
            </div>
            <div className="feature-item">
              <span className="check-icon">✓</span> WCAG 기준 평가 제공
            </div>
            <div className="feature-item">
              <span className="check-icon">✓</span> 바로 적용 가능한 코드 제안
            </div>
            <div className="feature-item">
              <span className="check-icon">✓</span> GitHub 연동
            </div>
          </div>

          <button className="github-login-btn">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/25/25231.png" 
              alt="Github Logo" 
              className="btn-icon" 
            />
            GitHub으로 로그인
          </button>
        </section>

        {/* 오른쪽 일러스트 섹션 */}
        <section className="image-section">
          <img src={codeeIllust} alt="Codee Illustration" className="main-illust" />
        </section>
      </div>
    </div>
  );
};

export default Main;