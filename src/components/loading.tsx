import React from "react";
import styled, { css, keyframes } from "styled-components";

var spin = keyframes`
0% { transform: rotate(0deg); }
100% { transform: rotate(360deg); }
`;

const Container = styled.div`
  transform: scale(6);
`;

const animation = css`
  ${spin}
`;

var Spinner = styled.div`
  border: "16px solid #eee",
  borderTop: "16px solid #3ae",
  borderRadius: "50%",
  width: "100cm",
  height: "100cm",
  animation: ${animation},
`;

const Loading: React.FC = () => {
  return (
    <Container style={{ position: "relative", width: 200, height: 100 }}>
      <Spinner />
    </Container>
  );
};

export default Loading;
