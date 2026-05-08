export const applyInsertedMessage = (currentConversations, newMessage) => {
  const conversationIndex = currentConversations.findIndex(
    (conversation) => conversation.id === newMessage.conversation_id
  );

  if (conversationIndex === -1) {
    return currentConversations;
  }

  const nextConversations = [...currentConversations];
  const conversation = nextConversations[conversationIndex];
  const messages = conversation.messages || [];

  if (messages.some((message) => message.id === newMessage.id)) {
    return currentConversations;
  }

  const updatedConversation = {
    ...conversation,
    messages: [...messages, newMessage],
  };

  nextConversations.splice(conversationIndex, 1);
  return [updatedConversation, ...nextConversations];
};

export const applyInsertedConversation = (currentConversations, newConversation) => {
  if (currentConversations.some((conversation) => conversation.id === newConversation.id)) {
    return currentConversations;
  }

  return [{ ...newConversation, messages: [] }, ...currentConversations];
};

export const resolveSelectedConversationId = ({
  currentId,
  deepLinkConversationId,
  conversations,
  isMobile = typeof window !== 'undefined' && window.innerWidth < 768,
}) => {
  if (
    deepLinkConversationId &&
    conversations.some((conversation) => conversation.id === deepLinkConversationId)
  ) {
    return deepLinkConversationId;
  }

  if (conversations.some((conversation) => conversation.id === currentId)) {
    return currentId;
  }

  if (isMobile) {
    return null;
  }

  return conversations[0]?.id || null;
};

export const subscribeToConversationRealtime = ({
  supabase,
  accessToken,
  onMessageInsert,
  onConversationInsert,
  onStatus,
}) => {
  if (!accessToken) {
    return () => {};
  }

  const channel = supabase
    .channel('realtime:conversations_and_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        onMessageInsert?.(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        onConversationInsert?.(payload.new);
      }
    )
    .subscribe((status) => {
      onStatus?.(status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};
