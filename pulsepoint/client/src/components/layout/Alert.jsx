import React, { useContext } from 'react';
import AlertContext from '../../context/alert/alertContext';
import { Snackbar, Alert as MuiAlert, useTheme } from '@mui/material';

const Alert = () => {
  const alertContext = useContext(AlertContext);
  const { alert, removeAlert } = alertContext;
  const theme = useTheme();

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    removeAlert();
  };

  if (!alert) return null;

  return (
    <Snackbar
      open={!!alert}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        '& .MuiPaper-root': {
          minWidth: '300px',
          maxWidth: '90%',
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)',
        },
        zIndex: theme.zIndex.snackbar,
      }}
    >
      <MuiAlert
        onClose={handleClose}
        severity={alert.type || 'info'}
        elevation={6}
        variant="filled"
        sx={{
          width: '100%',
          alignItems: 'center',
          '& .MuiAlert-message': {
            padding: '8px 0',
            '& a': {
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'none',
              },
            },
          },
        }}
      >
        {typeof alert.msg === 'string' ? (
          <div dangerouslySetInnerHTML={{ __html: alert.msg }} />
        ) : (
          alert.msg
        )}
      </MuiAlert>
    </Snackbar>
  );
};

export default Alert;
