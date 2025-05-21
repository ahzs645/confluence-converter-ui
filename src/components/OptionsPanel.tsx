import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { ConversionOptions } from '../utils/types';

interface OptionsPanelProps {
  options: ConversionOptions;
  onOptionsChange: (options: ConversionOptions) => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  options,
  onOptionsChange,
}) => {
  const handleChange = (name: keyof ConversionOptions, value: any) => {
    onOptionsChange({
      ...options,
      [name]: value,
    });
  };

  const handleMacroChange = (value: 'convert' | 'remove' | 'preserve') => {
    onOptionsChange({
      ...options,
      macroHandling: value,
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Conversion Options
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={options.includeBreadcrumbs}
              onChange={(e) => handleChange('includeBreadcrumbs', e.target.checked)}
            />
          }
          label="Include Breadcrumbs"
        />

        <FormControl fullWidth>
          <InputLabel>Panel Style</InputLabel>
          <Select
            value={options.panelStyle}
            label="Panel Style"
            onChange={(e) => handleChange('panelStyle', e.target.value)}
          >
            <MenuItem value="blockquote">Blockquote</MenuItem>
            <MenuItem value="div">Div</MenuItem>
            <MenuItem value="section">Section</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Table Style</InputLabel>
          <Select
            value={options.tableStyle}
            label="Table Style"
            onChange={(e) => handleChange('tableStyle', e.target.value)}
          >
            <MenuItem value="github">GitHub</MenuItem>
            <MenuItem value="simple">Simple</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Code Block Style</InputLabel>
          <Select
            value={options.codeBlockStyle}
            label="Code Block Style"
            onChange={(e) => handleChange('codeBlockStyle', e.target.value)}
          >
            <MenuItem value="fenced">Fenced</MenuItem>
            <MenuItem value="indented">Indented</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Image Style</InputLabel>
          <Select
            value={options.imageStyle}
            label="Image Style"
            onChange={(e) => handleChange('imageStyle', e.target.value)}
          >
            <MenuItem value="markdown">Markdown</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Link Style</InputLabel>
          <Select
            value={options.linkStyle}
            label="Link Style"
            onChange={(e) => handleChange('linkStyle', e.target.value)}
          >
            <MenuItem value="markdown">Markdown</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Heading Style</InputLabel>
          <Select
            value={options.headingStyle}
            label="Heading Style"
            onChange={(e) => handleChange('headingStyle', e.target.value)}
          >
            <MenuItem value="atx">ATX</MenuItem>
            <MenuItem value="setext">Setext</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Macro Handling</InputLabel>
          <Select
            value={options.macroHandling}
            label="Macro Handling"
            onChange={(e) => handleMacroChange(e.target.value as 'convert' | 'remove' | 'preserve')}
          >
            <MenuItem value="convert">Convert</MenuItem>
            <MenuItem value="remove">Remove</MenuItem>
            <MenuItem value="preserve">Preserve</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={options.includeLastModified}
              onChange={(e) => handleChange('includeLastModified', e.target.checked)}
            />
          }
          label="Include Last Modified"
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.includeMetadata}
              onChange={(e) => handleChange('includeMetadata', e.target.checked)}
            />
          }
          label="Include Metadata"
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.includeMacros}
              onChange={(e) => handleChange('includeMacros', e.target.checked)}
            />
          }
          label="Include Macros"
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.includeImages}
              onChange={(e) => handleChange('includeImages', e.target.checked)}
            />
          }
          label="Include Images"
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.includeLinks}
              onChange={(e) => handleChange('includeLinks', e.target.checked)}
            />
          }
          label="Include Links"
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.includeCodeBlocks}
              onChange={(e) => handleChange('includeCodeBlocks', e.target.checked)}
            />
          }
          label="Include Code Blocks"
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.includeTables}
              onChange={(e) => handleChange('includeTables', e.target.checked)}
            />
          }
          label="Include Tables"
        />
      </Box>
    </Paper>
  );
};