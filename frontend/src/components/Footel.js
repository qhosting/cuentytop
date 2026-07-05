import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: '#080b11', 
        color: '#9ca3af', 
        py: 4, 
        mt: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Container maxWidth="lg">
        <Typography 
          variant="body2" 
          align="center"
          sx={{ 
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.85rem',
            letterSpacing: '0.02em'
          }}
        >
          © {new Date().getFullYear()} Cuenty. Todos los derechos reservados.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
