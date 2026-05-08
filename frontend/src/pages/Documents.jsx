import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Popconfirm, Space, Tag, Typography, Upload, message } from 'antd';
import { Database, FileText, Search, Trash2, UploadCloud } from 'lucide-react';
import api from '../lib/api';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const surfaceStyle = {
  background: '#171717',
  border: '1px solid #2a2a2a',
  borderRadius: '12px',
};

const formatRelativeTime = (dateString) => {
  const timestamp = new Date(dateString).getTime();
  const now = Date.now();
  const diffInMinutes = Math.max(1, Math.floor((now - timestamp) / 60000));

  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const formatFileSize = (text = '') => {
  const bytes = new Blob([text]).size;

  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${bytes} B`;
};

const getVectorDensity = (document) => {
  const textLength = document?.extracted_text?.length || 0;
  const estimatedNodes = Math.max(1, Math.ceil(textLength / 450));

  if (estimatedNodes >= 1000) return `${(estimatedNodes / 1000).toFixed(1)}k nodes`;
  return `${estimatedNodes} nodes`;
};

const getStatusConfig = (status) => {
  if (status === 'indexed') {
    return {
      label: 'Indexed',
      background: 'rgba(34, 197, 94, 0.14)',
      border: '1px solid rgba(34, 197, 94, 0.28)',
      color: '#22c55e',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Processing',
      background: 'rgba(250, 204, 21, 0.12)',
      border: '1px solid rgba(250, 204, 21, 0.24)',
      color: '#facc15',
    };
  }

  return {
    label: 'Failed',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.24)',
    color: '#ef4444',
  };
};

const Documents = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/documents');
        setDocuments(data || []);
      } catch (error) {
        messageApi.error('Failed to fetch documents');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const refreshDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/documents');
      setDocuments(data || []);
    } catch (error) {
      messageApi.error('Failed to fetch documents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const indexedDocuments = useMemo(
    () => documents.filter((document) => document.status === 'indexed'),
    [documents]
  );

  const indexedTextVolumeGb = useMemo(() => {
    const totalBytes = indexedDocuments.reduce((sum, document) => {
      return sum + new Blob([document.extracted_text || '']).size;
    }, 0);

    if (totalBytes === 0) return '0.0GB';
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }, [indexedDocuments]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return documents.filter((document) => {
      return (
        normalizedSearch.length === 0 ||
        document.filename.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [documents, searchTerm]);

  const handleDelete = async (documentId) => {
    setDeletingId(documentId);
    try {
      await api.delete(`/api/documents/${documentId}`);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId)
      );
      messageApi.success('Source deleted');
    } catch (error) {
      messageApi.error('Failed to delete source');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    accept: '.pdf',
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      if (!isPDF) {
        messageApi.error(`${file.name} is not a PDF file. Only PDF files are supported.`);
        return false;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      if (!isPDF) {
        return;
      }

      const messageKey = `upload-${file.uid || file.name}`;
      
      messageApi.open({
        key: messageKey,
        type: 'loading',
        content: `Uploading ${file.name}...`,
        duration: 0,
      });

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        onSuccess?.(response.data);
        
        messageApi.open({
          key: messageKey,
          type: 'success',
          content: `${file.name} uploaded and indexed successfully!`,
          duration: 3,
        });

        refreshDocuments();
      } catch (error) {
        onError?.(error);
        
        const backendError = error.response?.data?.error || error.message || 'Upload failed';
        
        messageApi.open({
          key: messageKey,
          type: 'error',
          content: `${file.name}: ${backendError}`,
          duration: 4,
        });
      }
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '48px' }}>
      {contextHolder}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: '#fff', fontSize: '32px' }}>
          Knowledge Base
        </Title>
        <Paragraph style={{ color: '#888', fontSize: '15px', marginTop: '10px', maxWidth: '620px' }}>
          Upload source material, monitor indexed text volume, and manage indexed knowledge sources from one place.
        </Paragraph>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
          marginBottom: '40px',
        }}
      >
        <div style={{ ...surfaceStyle, padding: '20px' }}>
          <Dragger
            {...uploadProps}
            style={{
              background: 'linear-gradient(180deg, #1b1b1b 0%, #151515 100%)',
              border: '1px dashed #303030',
              borderRadius: '12px',
              padding: '48px 24px',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                margin: '0 auto 18px',
                borderRadius: 14,
                border: '1px solid #2f2f2f',
                display: 'grid',
                placeItems: 'center',
                background: '#111111',
              }}
            >
              <UploadCloud size={22} color="#facc15" />
            </div>
            <Title level={3} style={{ color: '#fff', fontSize: '24px', marginBottom: '8px' }}>
              Upload Knowledge
            </Title>
            <Paragraph style={{ color: '#777', maxWidth: 420, margin: '0 auto 24px' }}>
              Drag and drop PDFs here to begin indexing your knowledge base.
            </Paragraph>
            <Space size="middle" wrap>
              <Button type="primary">
                Select Files
              </Button>
            </Space>
          </Dragger>
        </div>

        <div
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(250, 204, 21, 0.25)',
            background: '#facc15',
            color: '#161616',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 320,
          }}
        >
          <div>
            <Title level={3} style={{ color: '#161616', fontSize: '18px', marginBottom: '10px' }}>
              Indexed Text Volume
            </Title>
            <Paragraph style={{ color: 'rgba(22, 22, 22, 0.82)', fontSize: '15px', marginBottom: '28px' }}>
              Text extracted from {indexedDocuments.length} indexed source{indexedDocuments.length === 1 ? '' : 's'}.
            </Paragraph>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>{indexedTextVolumeGb}</span>
              <Text style={{ color: 'rgba(22, 22, 22, 0.72)', fontWeight: 600 }}>Indexed Text Volume</Text>
            </div>
            <div style={{ width: 112, height: 4, borderRadius: 999, background: '#161616', marginBottom: '18px' }} />
            <Space size="middle" align="center">
              <Space size={8} align="center">
                <Database size={16} color="#161616" />
                <Text style={{ color: '#161616', fontWeight: 700 }}>{documents.length} Total Sources</Text>
              </Space>
            </Space>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Title level={3} style={{ color: '#fff', fontSize: '20px', margin: 0 }}>
          Managed Sources
        </Title>
        <Space size="small" wrap>
          <Input
            allowClear
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search sources"
            prefix={<Search size={15} color="#777" />}
            style={{
              width: 220,
              background: '#171717',
              border: '1px solid #2a2a2a',
              color: '#fff',
            }}
          />
        </Space>
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        {filteredDocuments.length === 0 ? (
          <div style={{ ...surfaceStyle, padding: '48px 24px' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={loading ? 'Loading sources...' : 'No sources match this filter'}
            />
          </div>
        ) : (
          filteredDocuments.map((document) => {
            const status = getStatusConfig(document.status);

            return (
              <div
                key={document.id}
                style={{
                  ...surfaceStyle,
                  padding: '18px 20px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: '18px',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', minWidth: 0 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '10px',
                      border: '1px solid #2a2a2a',
                      background: '#111111',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} color="#9ca3af" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ color: '#f3f3f3', fontSize: '17px', display: 'block', marginBottom: '2px' }}>
                      {document.filename}
                    </Text>
                    <Text style={{ color: '#777', fontSize: '13px' }}>
                      {`Knowledge | ${formatFileSize(document.extracted_text || '')} | Added ${formatRelativeTime(document.created_at)}`}
                    </Text>
                  </div>
                </div>

                <div style={{ minWidth: 180, flex: '0 1 220px' }}>
                  <Text style={{ color: '#666', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    {document.status === 'indexed' ? 'Vector Density' : 'Last Update'}
                  </Text>
                  <Text style={{ color: '#d9d9d9', fontSize: '24px', fontWeight: 700, lineHeight: 1.1 }}>
                    {document.status === 'indexed' ? getVectorDensity(document) : formatRelativeTime(document.created_at)}
                  </Text>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifySelf: 'end' }}>
                  <Tag
                    style={{
                      margin: 0,
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: status.background,
                      border: status.border,
                      color: status.color,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {status.label}
                  </Tag>
                  <Popconfirm
                    title="Delete this source?"
                    description="This will remove the knowledge source and its indexed chunks."
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(document.id)}
                  >
                    <Button
                      type="text"
                      loading={deletingId === document.id}
                      icon={deletingId === document.id ? null : <Trash2 size={16} />}
                      style={{ color: '#888' }}
                      aria-label={`Delete ${document.filename}`}
                    />
                  </Popconfirm>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Documents;
